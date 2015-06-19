cd "$(dirname "$0")" || exit
rsync -rvuc --exclude '.*' ../../../openshift/$(basename "$(dirname "$(pwd)")")/$(basename "$(pwd)")/node_modules/ modules/ || exit
rsync -rvuc --exclude '.*' ../../../dotcloud/$(basename "$(dirname "$(pwd)")")/$(basename "$(pwd)")/modules/ modules/ || exit
rsync -rvuc --exclude '.*' ../../../heroku/$(basename "$(dirname "$(pwd)")")/$(basename "$(pwd)")/modules/ modules/ || exit
rsync -rvuc --exclude '.*' ../../../appharbor/$(basename "$(dirname "$(pwd)")")/$(basename "$(pwd)")/modules/ modules/ || exit
if ! grep "$(basename "$(dirname "$(pwd)")")" "$HOME/.cloudControl/user.cfg" ; then
	cctrluser setup --email "$(basename "$(dirname "$(pwd)")")" --ssh-auth yes --ssh-key-path "$HOME/.ssh/id_rsa.pub" || exit
	grep "$(basename "$(dirname "$(pwd)")")" "$HOME/.cloudControl/user.cfg" || exit
fi
git add . || exit
git commit -am "make it better" || exit
cctrlapp $(basename "$(pwd)")/default push || exit
cctrlapp $(basename "$(pwd)")/default deploy || exit
cctrlapp $(basename "$(pwd)")/default log error

