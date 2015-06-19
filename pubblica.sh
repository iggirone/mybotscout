cd "$(dirname "$0")" || exit
rsync -rvuc --exclude '.*' ../../../openshift/$(   basename "$(dirname "$(pwd)")")/$(basename "$(pwd)")/node_modules/ modules/ || exit
rsync -rvuc --exclude '.*' ../../../dotcloud/$(    basename "$(dirname "$(pwd)")")/$(basename "$(pwd)")/modules/      modules/ || exit
rsync -rvuc --exclude '.*' ../../../heroku/$(      basename "$(dirname "$(pwd)")")/$(basename "$(pwd)")/modules/      modules/ || exit
rsync -rvuc --exclude '.*' ../../../appharbor/$(   basename "$(dirname "$(pwd)")")/$(basename "$(pwd)")/modules/      modules/ || exit
rsync -rvuc --exclude '.*' ../../../cloudcontrol/$(basename "$(dirname "$(pwd)")")/$(basename "$(pwd)")/modules/      modules/ || exit
rsync -rvuc --exclude '.*' modules/ ../../../openshift/$(   basename "$(dirname "$(pwd)")")/$(basename "$(pwd)")/node_modules/  || exit
rsync -rvuc --exclude '.*' modules/ ../../../dotcloud/$(    basename "$(dirname "$(pwd)")")/$(basename "$(pwd)")/modules/       || exit
rsync -rvuc --exclude '.*' modules/ ../../../heroku/$(      basename "$(dirname "$(pwd)")")/$(basename "$(pwd)")/modules/       || exit
rsync -rvuc --exclude '.*' modules/ ../../../appharbor/$(   basename "$(dirname "$(pwd)")")/$(basename "$(pwd)")/modules/       || exit
rsync -rvuc --exclude '.*' modules/ ../../../cloudcontrol/$(basename "$(dirname "$(pwd)")")/$(basename "$(pwd)")/modules/       || exit
if ! [ -d .git ]; then
	git init || exit
	git remote add origin https://iggirone:essediesse0@github.com/iggirone/mybotscout4Scaling.git || exit
fi
git add . || exit
git commit -a -m "Do better!" || exit
git push -u origin master || exit

