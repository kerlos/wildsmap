const ghpages = require("gh-pages");
const path = require("path");

// Options for deployment
const options = {
  // Set the branch to deploy to
  branch: "gh-pages",
  // Set the directory to deploy from
  repo: undefined, // Use the default GitHub repository URL from package.json
  // Set the commit message
  message: "Auto-generated deployment to GitHub Pages",
  // Set the maximum file length to avoid ENAMETOOLONG errors
  maxFileLength: 120,
  // Set the git configuration
  git: "git",
  // Set the silent option to false to see the output
  silent: false,
  // Set the dotfiles option to true to include dotfiles
  dotfiles: true,
  // Add a .nojekyll file to the deployment
  add: true,
};

// Deploy the dist directory to GitHub Pages
ghpages.publish(path.join(__dirname, "dist"), options, function (err) {
  if (err) {
    console.error("Deployment error:", err);
    process.exit(1);
  } else {
    console.log("Deployment successful!");
  }
});
