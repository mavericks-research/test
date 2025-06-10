// src/components/AdBanner.jsx
import React, { useEffect } from 'react';
import './AdBanner.css';

const AdBanner = ({ network = 'coinzilla' }) => {
  useEffect(() => {
    if (network === 'coinzilla') {
      const script = document.createElement('script');
      script.src = 'https://coinzillatag.com/lib/display.js';
      script.async = true;
      document.body.appendChild(script);
      return () => document.body.removeChild(script);
    }

    if (network === 'bitmedia') {
      const script = document.createElement('script');
      script.src = '//cdn.bitmedia.io/js/inpage.js';
      script.async = true;
      document.body.appendChild(script);
      return () => document.body.removeChild(script);
    }
  }, [network]);

  return (
    <div className="ad-banner-container">
      {network === 'coinzilla' && (
        <div
          id="coinzillaAd"
          data-zone="f36e018ed565e719e1603591c63e1c25"
          className="coinzilla-ad"
        />
      )}

      {network === 'bitmedia' && (
        <div
          className="bitmedia-ad"
          data-bitmedia-zoneid="YOUR_BITMEDIA_ZONE_ID"
        />
      )}
    </div>
  );
};

export default AdBanner;
