import * as types from './actionTypes';
import Core from '../../Beefree/Core';
import Utils from '../../Beefree/Utils';
import Queue from 'promise-queue';
import InviteWallet from "../../libs/InviteWallet/InviteWallet";

const parts = window.location.href.split('/').filter(word => word.length === 64 || word.length === 128);
let currentHash = null;
if (parts.length > 0) {
    currentHash = parts[0];
}

console.log('currentHash', currentHash);
const inviteWallet = new InviteWallet('https://rinkeby.infura.io/v3/357ce0ddb3ef426ba0bc727a3c64c873');
let bee = null;
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    // dev code
    //bee = new Core('https://swarm-gateways.net', currentHash);
    bee = new Core('http://prototype.beefree.me', currentHash);
    //bee = new Core('https://testeron.pro/swarm-emulator/index.php/', currentHash);
    //bee = new Core('http://127.0.0.1:1111/index.php/', currentHash);
    //bee = new Core('http://127.0.0.1:8500', currentHash);
} else {
    // production code
    bee = new Core(window.location.origin, currentHash);
}

bee.onChangeHash = (hash) => {
    console.log('new hash is: ' + hash);
    //onChangeHash(hash);
};

const queue = new Queue(1, Infinity);

export const init = () => {
    return (dispatch) => bee.getMyProfile()
        .then(data => {
            dispatch({
                type: types.SOCIAL_USER_FETCHED,
                data,
                bee
            });

            return data;
        })
        .then(data => {
            if (data.last_post_id) {
                const lastPostId = data.last_post_id;
                for (let i = 0; i < 10; i++) {
                    const id = lastPostId - i;

                    //console.log('ID: ' + id);
                    if (id <= 0) {
                        break;
                    }

                    queue.add(() => {
                        return getPost(id, true)(dispatch);
                    });
                }

                queue.add(() => {
                    dispatch({
                        type: types.SOCIAL_INIT
                    });
                });
            }
        });
};

export const onChangeHash = (data) => {
    // todo binded to all changes
    return dispatch => dispatch({
        type: types.SOCIAL_ON_CHANGE_HASH,
        data
    });
};

export const getMyProfile = () => {
    return dispatch => bee.getMyProfile()
        .then(data => {
            return dispatch({
                type: types.SOCIAL_USER_FETCHED,
                data
            });
        });
};

export const getProfile = (hash) => {
    return dispatch => bee.getProfile(hash)
        .then(data => {
            //console.log(data);
            return dispatch({
                type: types.SOCIAL_USER_FETCHED,
                data
            });
        });
};

export const saveMyProfile = (data) => {
    return dispatch => {
        queue.add(() => {
            bee.saveProfile(data)
                .then(responseData => {
                    console.log(responseData);
                    return dispatch({
                        type: types.SOCIAL_PROFILE_SAVED,
                        hash: responseData.newHash,
                        data: responseData.data
                    });
                });
        });
    }
};

export const createWallPost = (description, attachments) => {
    return (dispatch, getState) => {
        queue.add(() => {
            dispatch({
                type: types.SOCIAL_WALL_POST_STARTED
            });

            return bee.createPost(description, attachments)
                .then(result => {
                    const dispatchData = {
                        type: types.SOCIAL_WALL_POST_CREATED,
                        data: result.data
                    };

                    return dispatch(dispatchData);
                });
        });
    }
};

export const updateWallPost = (id, data) => {
    return (dispatch, getState) => {
        dispatch({
            type: types.SOCIAL_WALL_POST_UPDATE_STARTED,
            data
        });

        queue.add(() => {
            return bee.updatePost(id, data)
                .then(result => {
                    const dispatchData = {
                        type: types.SOCIAL_WALL_POST_UPDATED,
                        data: result.data
                    };

                    return dispatch(dispatchData);
                });
        });
    }
};

export const deleteWallPost = (id) => {
    return (dispatch, getState) => {
        queue.add(() => {
            //console.log('run');
            dispatch({
                type: types.SOCIAL_WALL_POST_DELETING,
                id
            });

            return bee.deletePost(id)
                .then(result => {
                    const dispatchData = {
                        type: types.SOCIAL_WALL_POST_DELETED,
                        data: result.data,
                        id
                    };

                    return dispatch(dispatchData);
                });
        });
    }
};

export const getPost = (id, addReversed = false) => {
    return dispatch => bee.getPost(id)
        .then(data => {
            console.log(data);
            return dispatch({
                type: types.SOCIAL_WALL_POST_LOADED,
                isAddReversed: addReversed,
                data
            });
        })
        .catch(error => dispatch({
            type: types.SOCIAL_WALL_POST_LOADING_FAILED,
            data: error
        }));
};

export const doLike = (contentType, contentId) => {
    return dispatch => dispatch({
        type: types.SOCIAL_ON_CONTENT_LIKE,
        contentType,
        contentId
    });
};

export const doDislike = (contentType, contentId) => {
    return dispatch => dispatch({
        type: types.SOCIAL_ON_CONTENT_DISLIKE,
        contentType,
        contentId
    });
};

export const uploadUserFile = (uploadId, file, fileType) => {
    return dispatch => {
        dispatch({
            type: types.SOCIAL_ON_ADDED_UPLOADING,
            data: {
                internal_id: uploadId,
                name: file.name,
                isComplete: false,
                progressPercent: 10
            }
        });

        queue.add(() => {
            return Utils.resizeImages(file, [
                {
                    width: 100,
                    height: 100
                },
                {
                    width: 300,
                    height: 300
                },
                {
                    width: 800,
                    height: 800
                },
                {
                    width: 1600,
                    height: 1600
                }
            ])
                .then(data => {
                    dispatch({
                        type: types.SOCIAL_WALL_POST_IMAGE_PREVIEW_COMPLETE,
                        internal_id: uploadId,
                        data
                    });

                    return data;
                })
                .then(data => {
                    return bee.uploadUserFile(file, fileType, data)
                })
                .then(data => {
                    //console.log(data);
                    dispatch({
                        type: types.SOCIAL_ON_UPLOADED_USER_FILE,
                        internal_id: uploadId,
                        data
                    });
                });
        });

    }
};

export const getImagePreviewUrl = (fileId, width = 300, height = 300) => {
    return dispatch => {
        dispatch({
            type: types.SOCIAL_FILE_PREVIEW_RECEIVED,
            data: {
                file_id: fileId,
                width,
                height,
                preview: bee.getImagePreviewUrl(fileId, width, height)
            }
        });
    };
};

export const inviteSetAccount = (wallet, privateKey) => {
    return dispatch => {
        inviteWallet.setAccount(wallet, privateKey);
        dispatch({
            type: types.INVITE_SET_ACCOUNT,
            data: {}
        });

    }
};

export const createInvite = () => {
    return dispatch => {
        const invite = InviteWallet.randomString(10);
        let walletData = null;
        let address = null;
        let walletSwarmHash = null;
        dispatch({
            type: types.INVITE_START_CREATION,
            data: {invite}
        });

        return inviteWallet.createWallet()
            .then(data => {
                walletData = data;
                address = '0x' + walletData.data.address;

                dispatch({
                    type: types.INVITE_WALLET_CREATED,
                    data
                });

                return data;
            })
            .then(data => {
                dispatch({
                    type: types.INVITE_WALLET_UPLOADING_TO_SWARM
                });

                return bee.uploadWallet(JSON.stringify(data.data))
                    .then(hash => {
                        walletSwarmHash = hash;
                        console.log(hash);
                        dispatch({
                            type: types.INVITE_WALLET_UPLOADED_TO_SWARM,
                            data: hash
                        });

                        return hash;
                    });
            })
            .then(hash => {
                if (walletData && walletData.data && walletData.data.address) {

                } else {
                    // todo catch error
                    console.error('Empty wallet data');
                    return;
                }

                dispatch({
                    type: types.INVITE_START_INVITE_TRANSACTION,
                    data: hash
                });

                return inviteWallet.createInvite(invite, address, hash);
            })
            .then(data => {
                dispatch({
                    type: types.INVITE_INVITE_CREATED,
                    data: {
                        password: walletData.password,
                        privateKey: walletData.privateKey,
                        response: data,
                        address,
                        walletSwarmHash,
                    }
                });

                return true;
            });
    }
};

export const getSwarmWallet = (address, password) => {
    return dispatch => {
        dispatch({
            type: types.INVITE_SWARM_WALLET_BY_ADDRESS_START
        });
        return inviteWallet.getWalletHashByAddress(address)
            .then(swarmHash => {
                dispatch({
                    type: types.INVITE_SWARM_WALLET_BY_ADDRESS_HASH_RECEIVED,
                    data: swarmHash
                });

                return swarmHash;
            })
            .then(swarmHash => bee.downloadWallet(swarmHash))
            .then(data => data.json())
            .then(data => {
                    dispatch({
                        type: types.INVITE_SWARM_WALLET_BY_ADDRESS_RECEIVED,
                        data
                    });

                    return data;
                }
            )
            .then(data => inviteWallet.validate(data, password))
            .then(data => {
                dispatch({
                    type: types.INVITE_CHECK_WALLET_OK,
                    data: {
                        address,
                        privateKey: data
                    }
                });
            })
            .catch(error =>
                dispatch({
                    type: types.INVITE_SWARM_WALLET_BY_ADDRESS_FAILED,
                    data: error
                })
            );
    };
};
export const registerUser = (invite, username) => {
    return dispatch => {
        dispatch({
            type: types.INVITE_REGISTRATION_STARTED
        });
        let parsedInvite = {};
        try {
            parsedInvite = InviteWallet.parseInvite(invite);
        } catch (error) {
            dispatch({
                type: types.INVITE_REGISTRATION_FAILED,
                data: error
            });
            return;
        }

        return inviteWallet.getWalletHashByAddress(parsedInvite.address)
            .then(swarmHash => {
                /*dispatch({
                    type: types.INVITE_SWARM_WALLET_BY_ADDRESS_HASH_RECEIVED,
                    data: swarmHash
                });*/

                return swarmHash;
            })
            .then(swarmHash => bee.downloadWallet(swarmHash))
            .then(data => data.json())
            .then(data => {
                    /*dispatch({
                        type: types.INVITE_SWARM_WALLET_BY_ADDRESS_RECEIVED,
                        data
                    });*/

                    return data;
                }
            )
            .then(data => inviteWallet.validate(data, parsedInvite.password))
            /*.then(data => {
                dispatch({
                    type: types.INVITE_CHECK_WALLET_OK,
                    data: {
                        address,
                        privateKey: data
                    }
                });
            })*/
            .then(privateKey => inviteWallet.setAccount(parsedInvite.address, privateKey))
            .then(() => inviteWallet.setUsername(username))
            .then(result => {
                dispatch({
                    type: types.INVITE_REGISTRATION_COMPLETE,
                    data: result
                });

                return result;
            })
            .catch(error =>
                dispatch({
                    type: types.INVITE_REGISTRATION_FAILED,
                    data: error
                })
            );
    };
};

