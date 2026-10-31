import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";

// Allow the initial gallery render to settle on busy test runners.
configure({ asyncUtilTimeout: 3000 });

window.scrollTo = jest.fn();
