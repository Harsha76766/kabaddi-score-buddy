// vite.config.ts
import { defineConfig } from "file:///C:/Users/dell/Desktop/New%20folder%20(2)/kabaddi-score-buddy/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/dell/Desktop/New%20folder%20(2)/kabaddi-score-buddy/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///C:/Users/dell/Desktop/New%20folder%20(2)/kabaddi-score-buddy/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig(async ({ mode }) => {
  const plugins = [react()];
  if (mode === "development") {
    const { componentTagger } = await import("file:///C:/Users/dell/Desktop/New%20folder%20(2)/kabaddi-score-buddy/node_modules/lovable-tagger/dist/index.js");
    plugins.push(componentTagger());
  }
  return {
    server: {
      host: "::",
      port: 8080
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            radix: [
              "@radix-ui/react-accordion",
              "@radix-ui/react-alert-dialog",
              "@radix-ui/react-aspect-ratio",
              "@radix-ui/react-avatar",
              "@radix-ui/react-checkbox",
              "@radix-ui/react-collapsible",
              "@radix-ui/react-context-menu",
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-hover-card",
              "@radix-ui/react-label",
              "@radix-ui/react-menubar",
              "@radix-ui/react-navigation-menu",
              "@radix-ui/react-popover",
              "@radix-ui/react-progress",
              "@radix-ui/react-radio-group",
              "@radix-ui/react-scroll-area",
              "@radix-ui/react-select",
              "@radix-ui/react-separator",
              "@radix-ui/react-slider",
              "@radix-ui/react-slot",
              "@radix-ui/react-switch",
              "@radix-ui/react-tabs",
              "@radix-ui/react-toast",
              "@radix-ui/react-tooltip"
            ],
            forms: ["react-hook-form", "@hookform/resolvers"]
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkZWxsXFxcXERlc2t0b3BcXFxcTmV3IGZvbGRlciAoMilcXFxca2FiYWRkaS1zY29yZS1idWRkeVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcZGVsbFxcXFxEZXNrdG9wXFxcXE5ldyBmb2xkZXIgKDIpXFxcXGthYmFkZGktc2NvcmUtYnVkZHlcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2RlbGwvRGVza3RvcC9OZXclMjBmb2xkZXIlMjAoMikva2FiYWRkaS1zY29yZS1idWRkeS92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XHJcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gXCJ1cmxcIjtcclxuXHJcbi8vIEZJWDogZGVmaW5lIF9fZGlybmFtZSBmb3IgRVNNIGFuZCBhdm9pZCBzdGF0aWMgaW1wb3J0IG9mIGxvdmFibGUtdGFnZ2VyXHJcbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKGFzeW5jICh7IG1vZGUgfSkgPT4ge1xyXG4gIGNvbnN0IHBsdWdpbnMgPSBbcmVhY3QoKV07XHJcbiAgaWYgKG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIikge1xyXG4gICAgLy8gQ0hBTkdFOiBjYXN0IHRvIGFueSB0byBhdm9pZCB0eXBlIHJlc29sdXRpb24gZXJyb3IgaW4gZWRpdG9yc1xyXG4gICAgY29uc3QgeyBjb21wb25lbnRUYWdnZXIgfSA9IChhd2FpdCBpbXBvcnQoXCJsb3ZhYmxlLXRhZ2dlclwiKSkgYXMgYW55O1xyXG4gICAgcGx1Z2lucy5wdXNoKGNvbXBvbmVudFRhZ2dlcigpKTtcclxuICB9XHJcblxyXG4gIC8vIE1vdmUgc2VydmVyIGNvbmZpZyBpbnNpZGUgdGhlIHJldHVybmVkIG9iamVjdCBhbmQgcmV0dXJuIGEgc2luZ2xlIHZhbGlkIGNvbmZpZ1xyXG4gIHJldHVybiB7XHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgaG9zdDogXCI6OlwiLFxyXG4gICAgICBwb3J0OiA4MDgwLFxyXG4gICAgfSxcclxuICAgIHBsdWdpbnMsXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMjAwLFxyXG4gICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgICBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgICAgcmVhY3Q6IFtcInJlYWN0XCIsIFwicmVhY3QtZG9tXCJdLFxyXG4gICAgICAgICAgICByYWRpeDogW1xyXG4gICAgICAgICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LWFjY29yZGlvblwiLFxyXG4gICAgICAgICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LWFsZXJ0LWRpYWxvZ1wiLFxyXG4gICAgICAgICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LWFzcGVjdC1yYXRpb1wiLFxyXG4gICAgICAgICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LWF2YXRhclwiLFxyXG4gICAgICAgICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LWNoZWNrYm94XCIsXHJcbiAgICAgICAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtY29sbGFwc2libGVcIixcclxuICAgICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1jb250ZXh0LW1lbnVcIixcclxuICAgICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1kaWFsb2dcIixcclxuICAgICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51XCIsXHJcbiAgICAgICAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtaG92ZXItY2FyZFwiLFxyXG4gICAgICAgICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LWxhYmVsXCIsXHJcbiAgICAgICAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtbWVudWJhclwiLFxyXG4gICAgICAgICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LW5hdmlnYXRpb24tbWVudVwiLFxyXG4gICAgICAgICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LXBvcG92ZXJcIixcclxuICAgICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1wcm9ncmVzc1wiLFxyXG4gICAgICAgICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LXJhZGlvLWdyb3VwXCIsXHJcbiAgICAgICAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3Qtc2Nyb2xsLWFyZWFcIixcclxuICAgICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1zZWxlY3RcIixcclxuICAgICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1zZXBhcmF0b3JcIixcclxuICAgICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1zbGlkZXJcIixcclxuICAgICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1zbG90XCIsXHJcbiAgICAgICAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3Qtc3dpdGNoXCIsXHJcbiAgICAgICAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtdGFic1wiLFxyXG4gICAgICAgICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LXRvYXN0XCIsXHJcbiAgICAgICAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtdG9vbHRpcFwiLFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBmb3JtczogW1wicmVhY3QtaG9vay1mb3JtXCIsIFwiQGhvb2tmb3JtL3Jlc29sdmVyc1wiXSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfTtcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMFcsU0FBUyxvQkFBb0I7QUFDdlksT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQUhxTSxJQUFNLDJDQUEyQztBQU1wUixJQUFNLFlBQVksS0FBSyxRQUFRLGNBQWMsd0NBQWUsQ0FBQztBQUc3RCxJQUFPLHNCQUFRLGFBQWEsT0FBTyxFQUFFLEtBQUssTUFBTTtBQUM5QyxRQUFNLFVBQVUsQ0FBQyxNQUFNLENBQUM7QUFDeEIsTUFBSSxTQUFTLGVBQWU7QUFFMUIsVUFBTSxFQUFFLGdCQUFnQixJQUFLLE1BQU0sT0FBTyxnSEFBZ0I7QUFDMUQsWUFBUSxLQUFLLGdCQUFnQixDQUFDO0FBQUEsRUFDaEM7QUFHQSxTQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsSUFDUjtBQUFBLElBQ0E7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLEtBQUssS0FBSyxRQUFRLFdBQVcsT0FBTztBQUFBLE1BQ3RDO0FBQUEsSUFDRjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsdUJBQXVCO0FBQUEsTUFDdkIsZUFBZTtBQUFBLFFBQ2IsUUFBUTtBQUFBLFVBQ04sY0FBYztBQUFBLFlBQ1osT0FBTyxDQUFDLFNBQVMsV0FBVztBQUFBLFlBQzVCLE9BQU87QUFBQSxjQUNMO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsWUFDRjtBQUFBLFlBQ0EsT0FBTyxDQUFDLG1CQUFtQixxQkFBcUI7QUFBQSxVQUNsRDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
