
// Helper function to redirect users based on their role after login
export const redirectAfterLogin = async (userId: string | undefined, router: any) => {
  try {
    const response = await fetch(`/api/user/role/${userId}`);
    if (response.ok) {
      const resp = await response.json();
      if (resp?.role === 'ADMIN') {
        router.replace("/admin");
        return;
      } else {
        router.replace("/");
      }
    }
  } catch (error) {
    console.error('Error checking user role:', error);
  }
  router.replace("/");
};
