import React, {Component, Fragment} from 'react';
//import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import './Wall.css';
import {connect} from "react-redux";
import * as actions from "../../store/social/actions";

import PropTypes from "prop-types";
import WallCreatePost from "../WallCreatePost";
import WallPost from "../WallPost";

class Wall extends Component {

    render() {
        const {createWallPost, wallPosts} = this.props;
        //console.log(this.props);
        let posts = <p>Wall is empty</p>;
        if (wallPosts.length) {
            posts = wallPosts.map((item) => <WallPost key={item.id} item={item}/>);
        }

        return (
            <Fragment>
                <WallCreatePost/>
                <button onClick={() => createWallPost({description: 'Lol, created'})}>Create wall post</button>

                {posts}
            </Fragment>
        );
    }
}

Wall.propTypes = {
    wallPosts: PropTypes.arrayOf(PropTypes.shape({
        text: PropTypes.string
    })).isRequired,
    createWallPost: PropTypes.func.isRequired,
    getPost: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
    wallPosts: state.social.wallPosts
});

export default connect(mapStateToProps, actions)(Wall);