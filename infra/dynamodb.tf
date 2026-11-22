# Single table holding every user's folders and files (and, later, shares and quotas).
# The key design (PK/SK and GSI1) is documented in apps/api/src/repos/items.ts.

resource "aws_dynamodb_table" "main" {
  name = "cloudbox-${var.environment}"

  # On-demand: pay per request, no capacity to size. Cents at our scale.
  billing_mode = "PAY_PER_REQUEST"

  # Primary key: PK (partition) + SK (sort).
  hash_key  = "PK"
  range_key = "SK"

  # Only attributes used in keys are declared; every other attribute is schemaless.
  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  # Lists a folder's children: query GSI1PK = USER#<sub>#PARENT#<folder id>, sorted by GSI1SK.
  global_secondary_index {
    name            = "GSI1"
    projection_type = "ALL" # listing returns full items without a second read from the base table

    key_schema {
      attribute_name = "GSI1PK"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "GSI1SK"
      key_type       = "RANGE"
    }
  }

  # Restore the table to any second in the last 35 days (protects against bad writes and deletes).
  point_in_time_recovery {
    enabled = true
  }

  # `terraform destroy` (or deleting the resource) is refused until this is switched off.
  deletion_protection_enabled = true

  # Encryption at rest is on by default with an AWS-owned key (no cost, no configuration).
}
