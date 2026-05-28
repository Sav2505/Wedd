import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import App from "./App";
import { store } from "./store";
import RtlProvider from "./RtlProvider";
import { theme } from "./theme";
import "./index.css";
import 'leaflet/dist/leaflet.css';

document.documentElement.setAttribute("lang", "he");
document.documentElement.setAttribute("dir", "rtl");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <RtlProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
          </ThemeProvider>
        </RtlProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>
);
