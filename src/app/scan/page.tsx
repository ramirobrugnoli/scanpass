import PassportScanner from "../components/PassportScanner";

export default function ScanPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Passport Scanner</h1>
      <PassportScanner />
    </div>
  );
}
