# Values the frontend and later features need. Shown after `terraform apply`, or any time with `terraform output`.

output "user_pool_id" {
  description = "Cognito user pool ID."
  value       = aws_cognito_user_pool.main.id
}

output "app_client_id" {
  description = "App client ID for the React SPA (public, not a secret)."
  value       = aws_cognito_user_pool_client.web.id
}

output "login_domain" {
  description = "Base URL of the Managed Login pages."
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "issuer_url" {
  description = "Token issuer URL, used by API Gateway's JWT authorizer to validate tokens."
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}
