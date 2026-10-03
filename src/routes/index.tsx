import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="home-placeholder">
      <Button>Explorar NFTs</Button>
    </div>
  );
}
