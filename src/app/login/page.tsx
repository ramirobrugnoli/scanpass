import LoginForm from "../components/LoginForm";
import { JSX } from "react";

export const metadata = {
  title: "Login - ScanPass",
  description: "Log in to your ScanPass account",
};

export default function Login(): JSX.Element {
  return <LoginForm />;
}
