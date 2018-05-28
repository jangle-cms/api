# Jangle API
> A RESTful API built on top of Jangle Core.

## Overview

Jangle Core did all the hard work: Storing content, publishing, history, authentication. Jangle API is the layer on top that allows us to access our Jangle CMS content via automatically generated API endpoints.

This API is broken up into these major components:

- [Authentication API](#authentication-api)
- [List API](#list-api)
- [Item API]()

---

## Authentication API
> Creating users, signing in, getting tokens.

---

### __Can Sign Up__
> __`GET`__ `/api/auth/can-sign-up`

Find out if sign-up is allowed. Useful for sign-up / sign-in screens.

#### Example
```
GET /api/auth/can-sign-up
```

#### Returns

If sign up is allowed:

```json
{
    "error": false,
    "message": "Sign up allowed!",
    "data": true
}
```

If another user already exists:

```json
{
    "error": false,
    "message": "Cannot sign up.",
    "data": false
}
```

---

### __Sign Up__
> __`POST`__ `/api/auth/sign-up`

Create a new user for our Jangle instance, if no other users exist in the system.

#### Body

- `name` - The display name for the new user.
- `email` - The email for the new user.
- `password` - The password for the new user.

#### Example:

```json
{
    "name": "Ryan",
    "email": "ryan.nhg@gmail.com",
    "password": "jangleIsEasy"
}
```

#### Returns

If everything went okay, and the user was signed up:

```json
{
    "error": false,
    "message": "Sign up successful!",
    "data": {
        "name": "Ryan",
        "email": "ryan.nhg@gmail.com",
        "token": "<ryans-token>"
    }
}
```

If a user already exists (`/api/auth/can-sign-up` returned `false`):

```json
{
    "error": true,
    "message": "Admin user already exists.",
    "data": null
}
```

If the user provided was invalid:

```json
{
    "error": true,
    "message": "Could not create admin user.",
    "data": null
}
```

---

### __Sign In__
> `GET` `/api/auth/sign-in`

Sign in an existing Jangle user.

#### Params

- `email` - The email address of the user.
- `password` - The password of the user.

#### Example:

```
GET /api/auth/sign-in?email=ryan.nhg@gmail.com&password=jangleIsEasy
```

#### Returns

If the sign in was successful:

```json
{
    "error": false,
    "message": "Sign in successful!",
    "data": {
        "name": "Ryan",
        "email": "ryan.nhg@gmail.com",
        "token": "<ryans-token>"
    }
}
```

If that user doesn't exist or the password doesn't match:

```json
{
    "error": true,
    "message": "Failed to sign in.",
    "data": null
}
```

---

## List API
> Viewing and updating items in Jangle Lists.

### Overview

The List API exposes Jangle Core's function using RESTful API standards. Once you are familar with the List API, the Items API will feel super easy!

Here are all the endpoints for the List API

__Viewing Items__
- [Any](#any) - Returns if any items exist.
- [Count](#count) - Returns how many items we have.
- [Find](#find) - Finds items based on criteria.
- [Get](#get) - Gets an item by id.

__Editing Items__
- [Create](#create) - Create a new item.
- [Update](#update) - Fully replace an exising item.
- [Patch](#patch) - Partially update an exising item.

__Removing Items__
- [Remove](#remove) - Remove an exising item.
- [Restore](#restore) - Restore a removed item.

__History__
- [History](#history) - View an item's history.
- [Preview Rollback](#preview-rollback) - Preview a rollback, before committing it.
- [Rollback Version](#rollback) - Rollback to a previous version.

__Publishing__
- [Publish](#publish) - Publish an item.
- [Unpublish](#unpublish) - Unpublish an item.
- [Is Live](#is-live) - Check if an item is published.

__Meta__
- [Overview]() - View information about all lists.
- [Schema]() - View detailed information about a list.

---

### Authentication & Tokens

Both the List and Items API have certain endpoints that require a user token to interact with our content.

If we try to view unpublished items, edit an item, or delete something, Jangle needs to verify that we are an actual user in the system.

Otherwise, anyone could hit these URLs and ruin our day!

(The [Authentication API](#authentication-api) has endpoints for retrieving a valid user token.)


#### How to provide a token to Jangle API

Protected endpoints will check these places for a user token:

- `Authorization` header, with the `Bearer` schema (recommended)
    ```
    Authorization: Bearer our-token
    ```

- As a query parameter in your URL
    ```
    GET /api/lists/authors?token=our-token
    ```
---

### __Overview__
> __`GET`__ `/api/lists`

An overview of all lists in your Jangle collection.

__Note:__ Requires user token.

#### Returns

```json
{
    "error": false,
    "message": "Found 2 lists.",
    "data": [
        {
            "name": "Person",
            "slug": "people",
            "labels": {
                "singular": "Person",
                "plural": "People"
            }
        },
        {
            "name": "BlogPost",
            "slug": "blog-posts",
            "labels": {
                "singular": "Blog Post",
                "plural": "Blog Posts"
            }
        }
    ]
}
```

### __Any__
> __`GET`__ `/api/lists/:name/any`

__Note:__ If provided a user token, this will work with all items. Without a token, this will only work with _published_ items.

#### Options

__`where`__ - a JSON object filtering results. Uses the MongoDB [query selector format](https://docs.mongodb.com/manual/reference/operator/query/#query-selectors).

#### Examples

```
GET /api/lists/people/any
GET /api/lists/people/any?where={ "name": "Ryan" }
```

#### Returns

If any items were found:

```json
{
    "error": false,
    "message": "Found 1 person.",
    "data": true
}
```

If no items were found:

```json
{
    "error": false,
    "message": "Found no people.",
    "data": false
}
```

---

### __Count__
> __`GET`__ `/api/lists/:name/count`

__Note:__ If provided a user token, this will work with all items. Without a token, this will only work with _published_ items.

#### Options

__`where`__ - a JSON object filtering results. Uses the MongoDB [query selector format](https://docs.mongodb.com/manual/reference/operator/query/#query-selectors).

#### Examples

```
GET /api/lists/people/count
GET /api/lists/people/count?where={ "age": { "$gte": 24 } }
```

#### Returns

If any items were found:

```json
{
    "error": false,
    "message": "Found 1 person.",
    "data": 1
}
```

If no items were found:

```json
{
    "error": false,
    "message": "Found no people.",
    "data": 0
}
```

---

###  __Find__
> __`GET`__ `/api/lists/:name`

Finds items, returning them in a paginated list. (Max page size is 25)

__Note:__ If provided a user token, this will work with all items. Without a token, this will only work with _published_ items.

#### Options

__`where`__ - a JSON object filtering results. Uses the MongoDB [query selector format](https://docs.mongodb.com/manual/reference/operator/query/#query-selectors).

__`select`__ - a list of fields you are interested in returning. Uses Mongoose's [select format](http://mongoosejs.com/docs/api.html#query_Query-select).

__`populate`__ - an object using the Mongoose [populate format](http://mongoosejs.com/docs/api.html#query_Query-populate). (Useful for getting related items in one query.)

__`sort`__ - The field or fields you want to sort by. Uses the Mongoose [sort format](http://mongoosejs.com/docs/api.html#query_Query-sort).

__`page`__ - The page number to return, defaults to 1.

#### Examples

```
GET /api/lists/people
GET /api/lists/people?select=name,age
GET /api/lists/people?where={ "age": { "$gte": 18 } }
GET /api/lists/people?sort=name
GET /api/lists/people?populate=friends
```

#### Returns

If items were found:

```json
{
    "error": false,
    "message": "Found 4 people.",
    "data": [
        { /*...*/ },
        { /*...*/ },
        { /*...*/ },
        { /*...*/ }
    ]
}
```

If no items were found:

```json
{
    "error": false,
    "message": "Found no people.",
    "data": []
}
```

---

###  __Get__
> __`GET`__ `/api/lists/:name/:id`

Get an item with the provided id.

__Note:__ If provided a user token, this will work with all items. Without a token, this will only work with _published_ items.

#### Options

__`select`__ - a list of fields you are interested in returning. Uses Mongoose's [select format](http://mongoosejs.com/docs/api.html#query_Query-select).

__`populate`__ - an object using the Mongoose [populate format](http://mongoosejs.com/docs/api.html#query_Query-populate). (Useful for getting related items in one query.)

#### Examples

```
GET /api/lists/people/12345
GET /api/lists/people/12345?select=name,age
GET /api/lists/people/12345?populate=friends
```

#### Returns

If the item was found:

```json
{
    "error": false,
    "message": "Found 1 person.",
    "data": {
        "name": "Ryan",
        /*...*/
    }
}
```

If no items were found:

```json
{
    "error": false,
    "message": "Found no people.",
    "data": null
}
```

---

### __Create__
> __`POST`__ `/api/lists/:name`

Create a new, unpublished item in the specified list.

The item should be provided in the body of the `POST` request.

__Note:__ Requires a user token.

#### Example

```json
{
    "name": "Ryan",
    "age": 24
}
```

#### Returns

If the item was successfully created:

```json
{
    "error": false,
    "message": "Person created successfully!",
    "data": {
        "_id": 12345,
        "name": "Ryan",
        "age": 24,
        "jangle": { "version": 1, /*...*/ }
    }
}
```

If the item could not be created:

```json
{
    "error": true,
    "message": "Missing required fields: name.",
    "data": null
}
```

---

### __Update__
> __`POST`__ `/api/lists/:name/:id`

Update an existing item in the specified list.

The full item should be provided in the body of the `POST` request.

__Note:__ Requires a user token.

#### Example

```json
{
    "name": "Ryan",
    "age": 25
}
```

#### Returns

If the item was successfully updated:

```json
{
    "error": false,
    "message": "Person updated successfully!",
    "data": {
        "_id": 12345,
        "name": "Ryan",
        "age": 25,
        "jangle": { "version": 2, /*...*/ }
    }
}
```

If the item could not be updated:

```json
{
    "error": true,
    "message": "Missing required fields: age.",
    "data": null
}
```

---

### __Patch__
> __`PATCH`__ `/api/lists/:name/:id`

_Partially update_ an existing item in the specified list.

Only the updated fields should be provided in the body of the `PATCH` request.

__Note:__ Requires a user token.

#### Example

```json
{
    "age": 26
}
```

#### Returns

If the item was successfully updated:

```json
{
    "error": false,
    "message": "Person updated successfully!",
    "data": {
        "_id": 12345,
        "name": "Ryan",
        "age": 26,
        "jangle": { "version": 3, ... }
    }
}
```

If the item could not be updated:

```json
{
    "error": true,
    "message": "age must be a number.",
    "data": null
}
```

---

### __Remove__
> __`DELETE`__ `/api/lists/:name/:id`

Remove an existing item in the specified list.

The item can be recovered later, this just removes it from our list.

__Note:__ Requires a user token.

#### Example

```
DELETE /api/lists/people/12345
```

#### Returns

If the item was successfully removed:

```json
{
    "error": false,
    "message": "Person removed successfully!",
    "data": {
        "_id": 12345,
        "name": "Ryan",
        "age": 26,
        "jangle": { "version": 3, /*...*/ }
    }
}
```

If the item could not be created:

```json
{
    "error": true,
    "message": "age must be a number.",
    "data": null
}
```

---

### __Restore__
> __`POST`__ `/api/lists/:name/:id/restore`

Restores an existing item that was deleted, from the specified list.

__Note:__ Requires a user token.

#### Example

```
POST /api/lists/people/12345/restore
```

#### Returns

If the item was successfully restored:

```json
{
    "error": false,
    "message": "Person restored successfully!",
    "data": {
        "_id": 12345,
        "name": "Ryan",
        "age": 26,
        "jangle": { "version": 5, ... }
    }
}
```

If the item could not be restored:

```json
{
    "error": true,
    "message": "Could not find a person with id: 12345.",
    "data": null
}
```

---

### __History__
> __`GET`__ `/api/lists/:name/:id/history`

Shows the history of an existing item from the specified list.

__Note:__ Requires a user token.

#### Example

```
GET /api/lists/people/12345/history
```

#### Returns

If the item was found:

```json
{
    "error": false,
    "message": "Found the item's history.",
    "data": [
        { /*...*/ },
        { /*...*/ },
        { /*...*/ },
        { /*...*/ }
    ]
}
```

If the item could not be found:

```json
{
    "error": true,
    "message": "Could not find a person with id: 12345.",
    "data": null
}
```

---

### __Preview Rollback__
> __`GET`__ `/api/lists/:name/:id/preview/:version`

Preview the rollback of an existing item to a previous version.

__Note:__ Requires a user token.

#### Example

```
GET /api/lists/people/12345/preview/2
```

#### Returns

If the version was found:

```json
{
    "error": false,
    "message": "Previewing rollback!",
    "data": {
        "_id": 12345,
        "name": "Ryan",
        "age": 25,
        "jangle": { "version": 2, /*...*/ }
    }
}
```

If the item's rollback could not be previewed:

```json
{
    "error": true,
    "message": "Could not find version 100.",
    "data": null
}
```

---

### __Rollback__
> __`POST`__ `/api/lists/:name/:id/rollback/:version`

Rollback an existing item to a previous version.

__Note:__ Requires a user token.

#### Example

```
POST /api/lists/people/12345/rollback/2
```

#### Returns

If the version was successfully rolled back:

```json
{
    "error": false,
    "message": "Person rolled back successfully!",
    "data": {
        "_id": 12345,
        "name": "Ryan",
        "age": 25,
        "jangle": { "version": 2, /*...*/ }
    }
}
```

If the item could not be rolled back:

```json
{
    "error": true,
    "message": "Could not find version 100.",
    "data": null
}
```

---

### __Publish__
> __`POST`__ `/api/lists/:name/:id/publish`

Publish an existing item.

__Note:__ Requires a user token.

#### Example

```
POST /api/lists/people/12345/publish
```

#### Returns

If the item was successfully published:

```json
{
    "error": false,
    "message": "Person published successfully!",
    "data": {
        "name": "Ryan",
        "age": 25
    }
}
```

If the item could not be published:

```json
{
    "error": true,
    "message": "Could not find an item with that id.",
    "data": null
}
```

---

### __Unpublish__
> __`POST`__ `/api/lists/:name/:id/unpublish`

Unpublish an existing item.

__Note:__ Requires a user token.

#### Example

```
POST /api/lists/people/12345/unpublish
```

#### Returns

If the item was successfully unpublished:

```json
{
    "error": false,
    "message": "Person unpublished successfully!",
    "data": {
        "name": "Ryan",
        "age": 25
    }
}
```

If the item could not be unpublished:

```json
{
    "error": true,
    "message": "Could not find an item with that id.",
    "data": null
}
```

---

### __Is Live__
> __`GET`__ `/api/lists/:name/:id/is-live`

Determine if an item is currently published.

#### Example

```
POST /api/lists/people/12345/is-live
```

#### Returns

If the item is published:

```json
{
    "error": false,
    "message": "Person is published.",
    "data": true
}
```

If the item is not published:

```json
{
    "error": false,
    "message": "Person is not published.",
    "data": false
}
```

If the item could not be found:

```json
{
    "error": true,
    "message": "Could not find an item with that id.",
    "data": null
}
```
