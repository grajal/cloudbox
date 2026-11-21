terraform {
  required_version = ">= 1.9"

  # Which provider plugins this project needs. `terraform init` downloads them.
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0" # any 6.x release, never a new major version automatically
    }

    # Generates random values (used for the globally unique Cognito domain prefix).
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# How Terraform talks to AWS: your SSO profile and the region where resources are created.
# No credentials appear here. They come from `aws sso login --profile cloudbox`.
provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  # Every resource that supports tags gets these automatically,
  # so you can find (and cost-track) everything CloudBox creates.
  default_tags {
    tags = {
      Project     = "cloudbox"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
