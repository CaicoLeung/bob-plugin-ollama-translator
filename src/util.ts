import { HttpResponse, ServiceError, TextTranslateQuery } from "@bob-translate/types";
import { HTTP_ERROR_CODES } from "./constants";

export function handleGeneralError(query: TextTranslateQuery, error: ServiceError | HttpResponse) {
  if ("response" in error) {
    const { statusCode } = error.response;
    const reason = statusCode >= 400 && statusCode < 500 ? "param" : "api";
    const errorMessage = HTTP_ERROR_CODES[statusCode as keyof typeof HTTP_ERROR_CODES] || `HTTP ${statusCode}`;
    query.onCompletion({
      error: {
        type: reason,
        message: `接口响应错误 - ${errorMessage}`,
        addition: JSON.stringify(error),
      },
    });
  } else {
    query.onCompletion({
      error: {
        ...error,
        type: error.type || "unknown",
        message: error.message || "Unknown error",
      },
    });
  }
}