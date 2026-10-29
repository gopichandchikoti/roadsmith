/**
 * Starts downloading the screens a driver is likeliest to open next, so tapping a problem does not wait on the network.
 * Dynamic imports of the same file share one download with the lazy screens in App, so nothing is fetched twice.
 */
export function prefetchScreens(): void {
  void import('../pages/FixPage')
  void import('../features/diagnose/DiagnosePanel')
}
