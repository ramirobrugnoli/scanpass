import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");

  // Esto no se ejecutará debido a la redirección, pero se mantiene
  // en caso de que la redirección no funcione por algún motivo
  return null;
}
