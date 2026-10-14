import { router } from 'expo-router';

// Opening a lesson link directly on the web leaves nothing to go back to.
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
