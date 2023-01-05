
import Background from '../../assets/HomeBackground.svg';

export function Home(){
    return (
        <div style={{
            background :  `url(${Background})`,
            width : "100vw",
            height : "100vh",
            display : "flex",
            justifyContent : "center",
            paddingTop : "6rem",
        }}
        className = "HomePage">
            <label>Welcome! This is the home directory</label>


        </div>
    )
}
