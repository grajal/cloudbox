variable "aws_region" {
  description = "AWS region where CloudBox resources are created."
  type        = string
  default     = "eu-west-1"
}

variable "aws_profile" {
  description = "AWS CLI profile (SSO) Terraform uses to authenticate."
  type        = string
  default     = "cloudbox"
}

variable "environment" {
  description = "Environment name, used in resource names and tags."
  type        = string
  default     = "dev"
}

variable "callback_urls" {
  description = "URLs Cognito may redirect to after login (OAuth callback)."
  type        = list(string)
  default     = ["http://localhost:5173/callback"]
}

variable "logout_urls" {
  description = "URLs Cognito may redirect to after logout."
  type        = list(string)
  default     = ["http://localhost:5173/"]
}
