export function dispatchError(
  moduleName: string,
  errorMessage: string,
  error?: Event | unknown
) {
  const event = new CustomEvent('atmospheric-viz-error', {
    detail: {
      moduleName,
      msg: errorMessage,
      errorObject: error,
    },
  });
  document.dispatchEvent(event);
  console.error(moduleName, errorMessage, error);
}
