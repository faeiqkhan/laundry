export const getLanUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const queryLanUrl = params.get("lanUrl");

  if (queryLanUrl) {
    localStorage.setItem("lanUrl", queryLanUrl);
    return queryLanUrl;
  }

  return (
    import.meta.env.VITE_LAN_URL ??
    localStorage.getItem("lanUrl") ??
    window.location.origin
  );
};
