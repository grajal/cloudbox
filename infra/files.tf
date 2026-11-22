# Holds every user's uploaded files. Never served directly: access is only via presigned URLs.
resource "aws_s3_bucket" "files" {
  bucket = "cloudbox-${var.environment}-files-${random_string.bucket_suffix.result}"
}

# Ensures the bucket is private
resource "aws_s3_bucket_public_access_block" "files" {
  bucket = aws_s3_bucket.files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Ensures the bucket uses SSE, with AES256 protocol
resource "aws_s3_bucket_server_side_encryption_configuration" "files" {
  bucket = aws_s3_bucket.files.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Enables bucket versioning
resource "aws_s3_bucket_versioning" "files" {
  bucket = aws_s3_bucket.files.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Specifies the CORS configuration for the bucket, ensuring uploads and downloads from the browser
resource "aws_s3_bucket_cors_configuration" "files" {
  bucket = aws_s3_bucket.files.id
  cors_rule {
    allowed_methods = ["GET", "POST"]
    allowed_origins = local.web_origins
    allowed_headers = ["*"]    # the browser's preflight lists the headers it wants to send
    expose_headers  = ["ETag"] # lets the page read the ETag S3 returns for an upload
    max_age_seconds = 3000     # how long the browser may cache the preflight answer
  }
}

# Safeguard for future multipart uploads (files over 100 MB): parts of an abandoned multipart
# upload stay in the bucket, invisible but billed, until something aborts it. Our current single
# presigned POST never creates them, so today this rule has nothing to clean up.
resource "aws_s3_bucket_lifecycle_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

data "aws_iam_policy_document" "files_bucket" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.files.arn, "${aws_s3_bucket.files.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "files" {
  bucket = aws_s3_bucket.files.id
  policy = data.aws_iam_policy_document.files_bucket.json

  depends_on = [aws_s3_bucket_public_access_block.files]
}
