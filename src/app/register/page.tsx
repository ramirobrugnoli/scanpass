import RegisterForm from "../components/RegisterForm";
import { JSX } from "react";

export const metadata = {
  title: "Register - ScanPass",
  description: "Create a new ScanPass account",
};

export default function Register(): JSX.Element {
  return <RegisterForm />;
}
