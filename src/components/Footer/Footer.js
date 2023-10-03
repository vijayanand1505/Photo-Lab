import React from "react";
import "./Footer.scss";

function Footer() {
  return (
    <div
      style={{
        textAlign: "center",
        marginTop: "30px",
        color: "white",
        backgroundColor: "#1e1e1e",
        padding: "30px 0px",
      }}
    >
      <h2>Photo Lab | Static Site</h2>
      <h4>
        © {new Date().getFullYear()} PhotoLab.com - All Rights Copyright
        Reserved To {"  "}
        <span>
          <a
            href="https://vijayanandthangavel.netlify.app/"
            target="_blank"
            rel="noreferrer"
          >
            Vijay Anand
          </a>
        </span>
      </h4>
    </div>
  );
}

export default Footer;
