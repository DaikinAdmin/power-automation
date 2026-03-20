'use client';

import styles from './ContactMap.module.css';

export default function ContactMap() {
  const googleMapsUrl = 'https://www.google.com/maps/place/AMM+Project+Sp.+z+o.o./@51.0738089,16.9527888,17z';

  const handleOpenMaps = () => {
    window.open(googleMapsUrl, '_blank');
  };

  return (
    <div className="mt-8">
      <div className={`rounded-lg overflow-hidden shadow-md ${styles.mapWrapper}`}>
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2506.8776305794245!2d16.95278877656008!3d51.073808942285964!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x470fc1458656af5b%3A0xbec4ec597bd6c63e!2sAMM%20Project%20Sp.%20z%20o.o.!5e0!3m2!1suk!2spl!4v1772190543375!5m2!1suk!2spl"
          width="100%"
          height="400"
          style={{ border: 0, display: 'block' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}

