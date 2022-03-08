if [ ! -d "../soundplus-cdk" ] 
then
  echo installing soundplus-cdk
  git clone git@github.com:ihm-software/soundplus-cdk.git ../soundplus-cdk && npm i --prefix ../soundplus-cdk	
else
  echo soundplus-cdk exists
  exit 0
fi
