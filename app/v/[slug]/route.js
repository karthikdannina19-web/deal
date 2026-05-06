import { dbConnect } from "@/config/database";
import Vendor from "@/models/vendor.model";

export async function GET(req, { params }) {
  const { slug } = await params;
  await dbConnect();
  
  const vendor = await Vendor.findOne({ slug });
  
  if (!vendor) {
    return new Response("Vendor not found", { status: 404 });
  }

  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.rhock.user"; 
  const appDeepLink = `rhock://vendor/${vendor._id}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Redirecting to ${vendor.storeName}...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            margin: 0;
            background-color: #f8fafc;
            color: #1e293b;
          }
          .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 1rem;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            max-width: 90%;
            width: 400px;
          }
          .loader { 
            border: 3px solid #f1f5f9; 
            border-top: 3px solid #3b82f6; 
            border-radius: 50%; 
            width: 48px; 
            height: 48px; 
            animation: spin 1s linear infinite; 
            margin: 0 auto 1.5rem; 
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          h2 { margin-bottom: 0.5rem; font-size: 1.25rem; }
          p { color: #64748b; font-size: 0.875rem; line-height: 1.5; }
          .btn {
            display: inline-block;
            margin-top: 1.5rem;
            padding: 0.75rem 1.5rem;
            background-color: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 0.5rem;
            font-weight: 600;
            transition: background-color 0.2s;
          }
          .btn:hover { background-color: #2563eb; }
        </style>
        <script>
          // Automatic redirection attempt
          window.onload = function() {
            // Try to open the app
            window.location.href = "${appDeepLink}";
            
            // Fallback to Play Store after 3 seconds
            setTimeout(function() {
              if (!document.hidden) {
                window.location.href = "${playStoreUrl}";
              }
            }, 3000);
          };
        </script>
      </head>
      <body>
        <div class="container">
          <div class="loader"></div>
          <h2>Opening ${vendor.storeName}</h2>
          <p>We're taking you to the Rhock app to see this vendor's profile.</p>
          <a href="${playStoreUrl}" class="btn">Get the App</a>
        </div>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { 
      "Content-Type": "text/html",
      "Cache-Control": "no-store, max-age=0"
    },
  });
}
