import { redirect } from "next/navigation";

export default function Page() {
  redirect("/panel/extractor");
  return null;
}
