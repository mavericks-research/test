import { useEffect } from "react";

const CryptoNewsWidget = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://static.cryptopanic.com/static/js/widgets.min.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script); // cleanup
    };
  }, []);

  return (
    <a
      href="https://cryptopanic.com/"
      target="_blank"
      rel="noopener noreferrer"
      data-news_feed="trending"
      data-posts_limit="20"
      data-bg_color="#FFFFFF"
      data-text_color="#333333"
      data-link_color="#0091C2"
      data-header_bg_color="#30343B"
      data-header_text_color="#FFFFFF"
      className="CryptoPanicWidget"
    >
      Latest News
    </a>
  );
};

export default CryptoNewsWidget;
