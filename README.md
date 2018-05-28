# Jangle API
> A RESTful API built on top of Jangle Core.

## Overview

Jangle Core did all the hard work: Storing content, publishing, history, authentication. Jangle API is the layer on top that allows us to access our Jangle CMS content via automatically generated API endpoints.

This API is broken up into these major components:

- Authentication API
- List API
- Item API


## Authentication API
> Creating users, signing in, getting tokens.

### __`GET`__ `/api/auth/can-sign-up`

Find out if sign-up is allowed. Useful for sign-up / sign-in screens.

#### Returns

If sign up is allowed:

```json
true
```

If another user already exists:

```json
false
```


### __`POST`__ `/api/auth/sign-up`

Create a new user for our Jangle instance, if no other users exist in the system.

#### Body

- `name` - The display name for the new user.
- `email` - The email for the new user.
- `password` - The password for the new user.

Example:
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

### `GET` `/api/auth/sign-in`

Sign in an existing Jangle user.

#### Params

- `email` - The email address of the user.
- `password` - The password of the user.

Example:
```
/api/auth/sign-in?email=ryan.nhg@gmail.com&password=jangleIsEasy
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
