import subprocess
import os

prompt_path = "prompt"

print("🌸 Hello, lovely human. I’m your code companion.")
print("Type your request below. Type 'exit' to quit.\n")

while True:
    user_input = input("💬 You: ")

    if user_input.lower().strip() in ["exit", "quit"]:
        print("👋 Goodbye! See you soon.")
        break

    # Write the prompt
    with open(prompt_path, "w") as f:
        f.write(user_input)

    print("\n🤖 GPT Engineer is working on it...")

    # Run the lovable wrapper script
    subprocess.run(["./gpt-lovable.sh"])
    
    print("\n🧹 Prompt cleared. You can ask me something new now.\n")
