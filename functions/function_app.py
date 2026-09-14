import logging

import azure.functions as func

from ingestion import ingest
from query_api import handle_query, handle_schema

app = func.FunctionApp()


@app.schedule(schedule="0 0 6 * * *", arg_name="timer", run_on_startup=False)
def EvIngestion(timer: func.TimerRequest) -> None:
    logging.info("EvIngestion triggered")
    ingest()
    logging.info("EvIngestion finished")


@app.route(route="query", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
def SqlQueryApi(req: func.HttpRequest) -> func.HttpResponse:
    return handle_query(req)


@app.route(route="schema", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def SqlSchemaApi(req: func.HttpRequest) -> func.HttpResponse:
    return handle_schema(req)
