import BaseObject from "./BaseObject";

export default class PostAttachment extends BaseObject {
    constructor(data = {}) {
        super(data);
        //console.log(data);
    }

    getKeys() {
        return [
            'id',
            'previews',
            'type',
            'url',
            'post_id',
            'order',
            'object'
        ];
    }
}