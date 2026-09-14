variable "sql_admin_user" {
  description = "SQL Server administrator login."
  type        = string
  default     = "evadmin"
}

variable "sql_admin_password" {
  description = "SQL Server administrator password."
  type        = string
  sensitive   = true
}

variable "sql_readonly_password" {
  description = "SQL read-only user (ev_readonly) password."
  type        = string
  sensitive   = true
}
