import json
import logging


class JSONFormatter(logging.Formatter):
    """One JSON object per log line, so Cloud Run's stdout parser turns it straight into a
    structured Cloud Logging entry (its `severity` and `message` fields) with no client library.
    Never format a request or response body into a log record: only status, method and path."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {"severity": record.levelname, "message": record.getMessage()}
        if record.exc_info:
            payload["message"] += "\n" + self.formatException(record.exc_info)
        return json.dumps(payload)
