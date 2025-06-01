import { useEffect, useState } from 'react';
import axios from 'axios';

function useLocation() {
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });
  const [err, setErr] = useState(null);

  useEffect(() => {
    // First try to get coordinates via geolocation API
    // console.log("fetching location")
    // if (navigator.geolocation) {
    //   navigator.geolocation.getCurrentPosition(
    //     (position) => {
    //       const { latitude, longitude } = position.coords;
    //       setCoordinates({ latitude, longitude });
    //       console.log("navigaitor")
    //     },
    //     (err) => {
    //       setErr('Failed to get geolocation: ' + err.message);
    //       console.log('Failed to get geolocation: ' + err.message);

    //     }
    //   );
    // } else {
      // If geolocation is not available, fallback to IP-based geolocation
      axios.get('https://ipinfo.io/json?token=c414f57e-e84e-4952-9535-8439f51988a4')
        .then((response) => {
          const { loc } = response.data;
          const [latitude, longitude] = loc.split(',');
          setCoordinates({ latitude: parseFloat(latitude), longitude: parseFloat(longitude) });
          console.log('ipinfo.io')
        })
        .catch((err) => {
          setErr('Failed to fetch IP-based location: ' + err.message);
          console.log('Failed to fetch IP-based location: ' + err.message);
        });
    // }
  }, []);

  return { coordinates, err };
}

export default useLocation;
