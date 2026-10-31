import { FiArrowUpRight } from "react-icons/fi";
import { CREATOR_NAME, CREATOR_URL } from "../../utils/credits";

export default function CreatorCredit({ maintained = false, className = "" }) {
  return <a className={`creator-credit ${className}`} href={CREATOR_URL} target="_blank" rel="noopener noreferrer">
    <span>{maintained ? "Managed and maintained by" : "Made by"} <strong>{CREATOR_NAME}</strong></span>
    <FiArrowUpRight aria-hidden="true" />
  </a>;
}
