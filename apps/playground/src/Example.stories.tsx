import type { Meta, StoryObj } from "@storybook/react-vite";

function Example({ title }: { title: string }) {
  return (
    <main>
      <h1>{title}</h1>
      <p>Reusable-workflows-callers Storybook example.</p>
    </main>
  );
}

const meta = {
  title: "Example/Playground",
  component: Example,
  args: { title: "Playground" },
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
