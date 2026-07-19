import React, { useEffect, useRef } from "react";

// Uses Google Identity Services' imperative API rather than its
// declarative <div data-client_id=...> markup, since the script tag
// (index.html) loads async/defer and may not be ready the instant this
// component mounts -- the retry loop below waits for window.google to
// actually exist before initializing.
const GoogleSignInButton = ({ onCredential }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    function render() {
      if (cancelled || !buttonRef.current) return;

      if (!window.google?.accounts?.id) {
        setTimeout(render, 100);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (response) => onCredential(response.credential),
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: 280,
      });
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  return <div ref={buttonRef} />;
};

export default GoogleSignInButton;
