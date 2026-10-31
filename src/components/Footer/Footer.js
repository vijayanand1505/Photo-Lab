import { FiAperture, FiArrowUpRight } from "react-icons/fi";
import { CREATOR_NAME, CREATOR_URL } from "../../utils/credits";
export default function Footer() {
  return <footer className="site-footer"><div className="shell footer-inner"><div><span className="footer-brand"><FiAperture aria-hidden="true" /> photolab.</span><p>Search, edit, and organize photos.</p></div>
    <div className="footer-links"><div className="footer-credit">Photos provided by <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a><FiArrowUpRight aria-hidden="true" /></div><div className="footer-credit">Managed and maintained by <a href={CREATOR_URL} target="_blank" rel="noopener noreferrer">{CREATOR_NAME}</a><FiArrowUpRight aria-hidden="true" /></div><span>© {new Date().getFullYear()} Photo Lab</span></div></div></footer>;
}
