# Resume
 HTML Résumé builder

## How this System Works

1. **Input**: Users provide their résumé data (such as personal details, education, experience, and skills) through a structured data file (e.g., JSON).
2. **Processing**: The system processes the input data and maps it to a predefined HTML template.
3. **Template Rendering**: The résumé data is dynamically inserted into the template, generating a styled HTML résumé.
4. **Output**: Users can preview, download, or print the generated HTML résumé.

- The builder ensures that the résumé is formatted consistently and is easy to customize.

## Project Files

- **index.html**: The main HTML file that serves as the entry point for the résumé builder.
- **style.css**: Contains the styles and themes for the résumé layout.
- **app.js**: Handles the logic for processing user input and rendering the résumé.
- **template.html**: The HTML template used for generating the résumé.
- **data.json(.js)**: Example or default résumé data in JSON format.
- **README.md**: Project documentation and usage instructions.


## Preview

- Use https://marketplace.visualstudio.com/items?itemName=ms-vscode.live-server web preview extension

## Todo
- Additional features may include theme selection, section reordering, and PDF export.

## By:
- Ujjwal Singh ([github.com/ujLion](https://github.com/ujLion) | [ujnotes.com](https://ujnotes.com))

## To separate data into separate repo:
1. `git submodule add git@github.com:ujLion/resume.git .\data\ `
2. `index.html:9` : `<script src="./data/data.json.js">`
