import { LOGIN_URL } from "../../config";

const getLoginUrl = () =>
  process.env.NODE_ENV !== "production"
    ? LOGIN_URL.replace(
        "expense-tracking-importer-1a1b05tff-laurilarjo.vercel.app",
        "localhost%3A3000"
      )
    : LOGIN_URL;

const main = () => {
  return (
    <main className="flex items-center justify-center">
      <a href={getLoginUrl()}>Login</a>
    </main>
  );
};

export default main;
