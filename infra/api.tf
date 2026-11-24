# HTTP API (API Gateway v2) in front of one Lambda function per route.
# Adding an endpoint later = one more entry in local.functions + a handler in apps/api/src/handlers/.

locals {
  # key = handler file name (apps/api/src/handlers/<key>.ts), also the folder in apps/api/dist/.
  #
  # table_actions / index_actions: the DynamoDB permissions this function gets, and nothing more.
  # bucket_actions: the S3 permissions this function gets.
  functions = {
    health = { method = "GET", path = "/health", auth = false, table_actions = [], index_actions = [], bucket_actions = [] }
    me     = { method = "GET", path = "/me", auth = true, table_actions = [], index_actions = [], bucket_actions = [] }

    createFolder = {
      method         = "POST"
      path           = "/folders"
      auth           = true
      table_actions  = ["dynamodb:GetItem", "dynamodb:PutItem"] # check the parent, write the folder
      index_actions  = []
      bucket_actions = []
    }

    listChildren = {
      method         = "GET"
      path           = "/folders/{id}/children"
      auth           = true
      table_actions  = ["dynamodb:GetItem"] # check the folder exists
      index_actions  = ["dynamodb:Query"]   # list its children through GSI1
      bucket_actions = []
    }

    renameItem = {
      method         = "PATCH"
      path           = "/items/{id}"
      auth           = true
      table_actions  = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
      index_actions  = []
      bucket_actions = []
    }
  }

  # Browser origins allowed to call the API (CORS).
  web_origins = ["http://localhost:5173", "https://${aws_cloudfront_distribution.web.domain_name}"]
}

# ---------- Lambda functions ----------

# Zips apps/api/dist/<name>/ (index.mjs + source map). Run `pnpm build` before plan/apply.
data "archive_file" "lambda" {
  for_each = local.functions

  type        = "zip"
  source_dir  = "${path.module}/../apps/api/dist/${each.key}"
  output_path = "${path.module}/.build/${each.key}.zip"
}

# Created here (not by Lambda) so we control retention: Lambda's own log groups never expire.
resource "aws_cloudwatch_log_group" "lambda" {
  for_each = local.functions

  name              = "/aws/lambda/cloudbox-${var.environment}-${each.key}"
  retention_in_days = 14
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# One execution role per function: the identity the function runs as.
resource "aws_iam_role" "lambda" {
  for_each = local.functions

  name               = "cloudbox-${var.environment}-${each.key}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# Least privilege: each function may only write to its own log group, nothing else.
data "aws_iam_policy_document" "lambda_logs" {
  for_each = local.functions

  statement {
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.lambda[each.key].arn}:*"]
  }
}

resource "aws_iam_role_policy" "lambda_logs" {
  for_each = local.functions

  name   = "write-own-logs"
  role   = aws_iam_role.lambda[each.key].id
  policy = data.aws_iam_policy_document.lambda_logs[each.key].json
}

# DynamoDB access, only for the functions that declare actions in local.functions.
data "aws_iam_policy_document" "lambda_dynamodb" {
  for_each = { for name, f in local.functions : name => f if length(f.table_actions) + length(f.index_actions) > 0 }

  dynamic "statement" {
    for_each = length(each.value.table_actions) > 0 ? [1] : []
    content {
      sid       = "Table"
      actions   = each.value.table_actions
      resources = [aws_dynamodb_table.main.arn]
    }
  }

  dynamic "statement" {
    for_each = length(each.value.index_actions) > 0 ? [1] : []
    content {
      sid       = "Index"
      actions   = each.value.index_actions
      resources = ["${aws_dynamodb_table.main.arn}/index/GSI1"] # indexes have their own ARN
    }
  }
}

resource "aws_iam_role_policy" "lambda_dynamodb" {
  for_each = data.aws_iam_policy_document.lambda_dynamodb

  name   = "dynamodb-access"
  role   = aws_iam_role.lambda[each.key].id
  policy = each.value.json
}

data "aws_iam_policy_document" "lambda_s3" {
  for_each = {
    for name, f in local.functions : name => f
    if length(f.bucket_actions) > 0
  }

  statement {
    sid       = "S3"
    actions   = each.value.bucket_actions
    resources = ["${aws_s3_bucket.files.arn}/*"]
  }
}

resource "aws_iam_role_policy" "lambda_s3" {
  for_each = data.aws_iam_policy_document.lambda_s3

  name   = "s3-access"
  role   = aws_iam_role.lambda[each.key].id
  policy = each.value.json
}

resource "aws_lambda_function" "api" {
  for_each = local.functions

  function_name = "cloudbox-${var.environment}-${each.key}"
  role          = aws_iam_role.lambda[each.key].arn

  runtime       = "nodejs24.x"
  architectures = ["arm64"] # Graviton: cheaper per millisecond than x86
  handler       = "index.handler"
  memory_size   = 256 # MB; CPU scales with memory
  timeout       = 10  # seconds

  filename         = data.archive_file.lambda[each.key].output_path
  source_code_hash = data.archive_file.lambda[each.key].output_base64sha256 # redeploy when the code changes

  environment {
    variables = {
      NODE_OPTIONS = "--enable-source-maps" # stack traces point at the TypeScript source
      TABLE_NAME   = aws_dynamodb_table.main.name
      BUCKET_NAME  = aws_s3_bucket.files.id
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy.lambda_logs,
    aws_iam_role_policy.lambda_dynamodb,
    aws_iam_role_policy.lambda_s3
  ]
}

# ---------- API Gateway ----------

resource "aws_apigatewayv2_api" "main" {
  name          = "cloudbox-${var.environment}"
  protocol_type = "HTTP"

  # CORS: the browser asks permission (preflight) before calling an API on another origin.
  cors_configuration {
    allow_origins = local.web_origins
    allow_methods = ["GET", "POST", "PATCH"] # widen when we add PUT/DELETE endpoints
    allow_headers = ["authorization", "content-type"]
    max_age       = 3600
  }
}

# Checks the Bearer token on protected routes before any Lambda runs.
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  name             = "cognito"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
    audience = [aws_cognito_user_pool_client.web.id] # matched against the token's client_id (access token) or aud (ID token)
  }
}

resource "aws_apigatewayv2_integration" "api" {
  for_each = local.functions

  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY" # pass the whole request to Lambda, return its response as-is
  integration_uri        = aws_lambda_function.api[each.key].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "api" {
  for_each = local.functions

  api_id    = aws_apigatewayv2_api.main.id
  route_key = "${each.value.method} ${each.value.path}"
  target    = "integrations/${aws_apigatewayv2_integration.api[each.key].id}"

  authorization_type = each.value.auth ? "JWT" : "NONE"
  authorizer_id      = each.value.auth ? aws_apigatewayv2_authorizer.cognito.id : null
}

# $default stage: the API is served at the root of its URL, and changes deploy automatically.
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  # Cost and abuse cap: at most 5 requests/second sustained, bursts of 10.
  default_route_settings {
    throttling_rate_limit  = 5
    throttling_burst_limit = 10
  }
}

# Lambda refuses invocations unless its resource policy allows the caller. This lets this one
# API, and only for this one route, invoke this one function.
resource "aws_lambda_permission" "api" {
  for_each = local.functions

  statement_id  = "AllowInvokeFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  # Path parameters like {id} become * so the pattern matches whatever the real path is.
  source_arn = "${aws_apigatewayv2_api.main.execution_arn}/*/${each.value.method}${replace(each.value.path, "/\\{[^}]+\\}/", "*")}"
}
