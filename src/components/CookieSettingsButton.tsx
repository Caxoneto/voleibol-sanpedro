'use client';

export default function CookieSettingsButton() {
  const handleOpen = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-cookie-settings'));
    }
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="hover:text-primary transition-colors cursor-pointer text-left focus:outline-none"
    >
      Configuración de cookies
    </button>
  );
}
