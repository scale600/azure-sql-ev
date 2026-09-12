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
