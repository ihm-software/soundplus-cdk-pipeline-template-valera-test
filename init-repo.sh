echo "starting init-repo for {{repositoryName}}"
pwd
npm i -g gh
gh repo create ihm-software/{{repositoryName}} -t soundplus --private --confirm
git init
git add .
git commit -m "first commit"
git remote add origin git@github.com:ihm-software/{{repositoryName}}.git
git push -u origin master