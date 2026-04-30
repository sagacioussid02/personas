project_name             = "twin"
environment              = "dev"
bedrock_model_id         = "us.amazon.nova-2-lite-v1:0"
lambda_timeout           = 60
api_throttle_burst_limit = 10
api_throttle_rate_limit  = 5
use_custom_domain        = false
root_domain              = ""
# ses_from_email and admin_emails are intentionally omitted here.
# Set them via TF_VAR_ses_from_email / TF_VAR_admin_emails (e.g. from CI secrets).
# terraform.tfvars entries take precedence over TF_VAR_* env vars, so including
# them here with empty values would silently override any secret-injected values.