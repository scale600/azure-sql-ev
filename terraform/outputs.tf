output "resource_group_name" {
  description = "Azure resource group."
  value       = azurerm_resource_group.main.name
}

output "sql_server_fqdn" {
  description = "SQL Server fully-qualified domain name."
  value       = azurerm_mssql_server.main.fully_qualified_domain_name
}

output "database_name" {
  description = "Free-offer SQL database name."
  value       = azapi_resource.database.name
}

output "storage_account_name" {
  description = "Storage account name."
  value       = azurerm_storage_account.main.name
}

output "function_app_url" {
  description = "Function App default hostname."
  value       = azurerm_linux_function_app.main.default_hostname
}

output "static_web_app_url" {
  description = "Static Web App default hostname."
  value       = azurerm_static_web_app.main.default_host_name
}
