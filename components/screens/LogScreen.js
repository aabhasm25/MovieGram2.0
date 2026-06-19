"use client";

import { useState } from "react";
import Poster from "@/components/Poster";

export default function LogScreen() {
  const [logged, setLogged] = useState(false);

  return (
    <section className="log-screen">
      <div className="segmented">
        <button className="selected">Movie</button>
        <button>TV Show</button>
      </div>
      <Poster className="poster-interstellar" title="Interstellar" />
      <label>
        When did you watch it?
        <select defaultValue="today">
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">Earlier this week</option>
        </select>
      </label>
      <label>
        Your rating
        <span className="star-input">★★★★<i>★</i></span>
      </label>
      <label>
        What did you think?
        <textarea defaultValue="Mind-blowing. The ending still gives me chills." />
      </label>
      <button className="primary-button" onClick={() => setLogged(true)}>Log Movie</button>
      {logged && <p className="success-message">Interstellar was added to your diary.</p>}
    </section>
  );
}
