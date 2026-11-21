# Cognito user pool: the user directory and login service.
resource "aws_cognito_user_pool" "main" {
  name = "cloudbox-${var.environment}"

  # Users identify themselves with their email address (no separate username).
  username_attributes = ["email"]

  # Cognito emails a code to confirm the address before it is marked verified.
  auto_verified_attributes = ["email"]

  # Basic plan tier that includes Managed Login (the hosted login pages).
  user_pool_tier = "ESSENTIALS"

  # Safety net: while ACTIVE, deleting the pool (including `terraform destroy`) is refused
  # until this is switched to "INACTIVE" and applied.
  deletion_protection = "ACTIVE"

  # Invite-only: nobody can self-register. Users are created by an admin
  # (`aws cognito-idp admin-create-user`). Set to false to open registration later.
  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  # MFA is optional; users who want it can enroll an authenticator app (TOTP).
  mfa_configuration = "OPTIONAL"
  software_token_mfa_configuration {
    enabled = true
  }

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7 # how long an invited user has to log in the first time
  }

  # "Forgot password" works through the verified email.
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Cognito's built-in email sender: free, but limited to ~50 emails/day. Fine for invites.
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }
}

# App client: the registration of the React SPA with the pool.
resource "aws_cognito_user_pool_client" "web" {
  name         = "cloudbox-web-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  # A browser app cannot keep a secret, so there is none. PKCE protects the code exchange instead.
  generate_secret = false

  # OAuth 2.0 authorization code flow, the one used with PKCE.
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = ["COGNITO"] # add "Google" here when we federate later

  # Cognito only redirects to URLs on these lists: localhost for development plus the CloudFront site.
  callback_urls = concat(var.callback_urls, ["https://${aws_cloudfront_distribution.web.domain_name}/callback"])
  logout_urls   = concat(var.logout_urls, ["https://${aws_cloudfront_distribution.web.domain_name}/"])

  # Only the refresh-token grant is enabled; password flows are not needed with Managed Login.
  explicit_auth_flows = ["ALLOW_REFRESH_TOKEN_AUTH"]

  access_token_validity  = 60 # minutes
  id_token_validity      = 60 # minutes
  refresh_token_validity = 30 # days
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  enable_token_revocation       = true
  prevent_user_existence_errors = "ENABLED" # login errors don't reveal whether an email is registered
}

# The domain prefix must be unique across all of AWS, so we add a random suffix.
resource "random_string" "domain_suffix" {
  length  = 6
  upper   = false
  special = false
}

# The address of the hosted login pages: https://<prefix>.auth.<region>.amazoncognito.com
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "cloudbox-${var.environment}-${random_string.domain_suffix.result}"
  user_pool_id = aws_cognito_user_pool.main.id

  managed_login_version = 2 # 2 = Managed Login (the current hosted UI), 1 = classic hosted UI
}

# Managed Login needs a branding style attached to the client. We use Cognito's defaults for now.
resource "aws_cognito_managed_login_branding" "web" {
  client_id    = aws_cognito_user_pool_client.web.id
  user_pool_id = aws_cognito_user_pool.main.id

  use_cognito_provided_values = true
}
