export interface PrivateUser {
    id: string;
    fName: string;
    lName: string;
    email: string;
    password: string;
}

export interface PublicUser {
    id: string;
    fName: string;
    lName: string;
}

export interface UserArgs {
    usrInfo: {
        fName: string;
        lName: string;
        email: string;
        password: string;
    }
}

export interface updateUserArgs {
    id: string;
    usrInfo: {
        fName?: string;
        lName?: string;
        email?: string;
        password?: string;
    }
}